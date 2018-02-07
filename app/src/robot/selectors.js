// @flow
// robot selectors
import padStart from 'lodash/padStart'
import {createSelector} from 'reselect'

import type {
  Mount,
  Instrument,
  InstrumentCalibrationStatus,
  Labware,
  LabwareCalibrationStatus
} from './types'

import type {State as CalibrationState} from './reducer/calibration'
import type {State as ConnectionState} from './reducer/connection'
import type {State as SessionState} from './reducer/session'

import {
  type ConnectionStatus,
  type SessionStatus,
  _NAME
} from './constants'

type State = {
  robot: {
    calibration: CalibrationState,
    connection: ConnectionState,
    session: SessionState
  }
}
const calibration = (state: State): CalibrationState => state[_NAME].calibration

const connection = (state: State): ConnectionState => state[_NAME].connection

const session = (state: State): SessionState => state[_NAME].session
const sessionRequest = (state: State) => session(state).sessionRequest
const sessionStatus = (state: State) => session(state).state

export function getIsScanning (state: State): boolean {
  return connection(state).isScanning
}

export const getDiscovered = createSelector(
  (state: State) => connection(state).discovered,
  (state: State) => connection(state).discoveredByName,
  (state: State) => connection(state).connectedTo,
  (discovered, discoveredByName, connectedTo) => discovered.map((name) => ({
    ...discoveredByName[name],
    isConnected: connectedTo === name
  }))
)

export const getConnectionStatus = createSelector(
  (state: State) => connection(state).connectedTo,
  (state: State) => connection(state).connectRequest.inProgress,
  (state: State) => connection(state).disconnectRequest.inProgress,
  (connectedTo, isConnecting, isDisconnecting): ConnectionStatus => {
    if (!connectedTo && isConnecting) return 'connecting'
    if (connectedTo && !isDisconnecting) return 'connected'
    if (connectedTo && isDisconnecting) return 'disconnecting'

    return 'disconnected'
  }
)

export function getUploadInProgress (state: State) {
  return sessionRequest(state).inProgress
}

export function getUploadError (state: State): ?{message: string} {
  return sessionRequest(state).error
}

export function getSessionName (state: State): string {
  return session(state).name
}

export function getSessionIsLoaded (state: State): boolean {
  return sessionStatus(state) !== ('': SessionStatus)
}

export function getIsReadyToRun (state: State): boolean {
  return sessionStatus(state) === ('loaded': SessionStatus)
}

export function getIsRunning (state: State): boolean {
  const status = sessionStatus(state)

  return (
    status === ('running': SessionStatus) ||
    status === ('paused': SessionStatus)
  )
}

export function getIsPaused (state: State): boolean {
  return sessionStatus(state) === ('paused': SessionStatus)
}

export function getIsDone (state: State): boolean {
  const status = sessionStatus(state)

  return (
    status === ('error': SessionStatus) ||
    status === ('finished': SessionStatus) ||
    status === ('stopped': SessionStatus)
  )
}

// helper function for getCommands selector
function traverseCommands (commandsById, parentIsCurrent) {
  return function mapIdToCommand (id, index, commands) {
    const {description, handledAt, children} = commandsById[id]
    const next = commandsById[commands[index + 1]]
    const isCurrent = (
      parentIsCurrent &&
      handledAt != null &&
      (next == null || next.handledAt == null)
    )
    const isLast = isCurrent && !children.length

    return {
      id,
      description,
      handledAt,
      isCurrent,
      isLast,
      children: children.map(traverseCommands(commandsById, isCurrent))
    }
  }
}

export const getCommands = createSelector(
  (state: State) => session(state).protocolCommands,
  (state: State) => session(state).protocolCommandsById,
  (commands, commandsById) => commands.map(traverseCommands(commandsById, true))
)

export const getRunProgress = createSelector(
  getCommands,
  (commands): number => {
    const leaves = commands.reduce(countLeaves, {handled: 0, total: 0})

    return leaves.total && ((leaves.handled / leaves.total) * 100)

    function countLeaves (result, command) {
      let {handled, total} = result

      if (command.children.length) {
        return command.children.reduce(countLeaves, result)
      }

      if (command.handledAt) handled++
      total++

      return {handled, total}
    }
  }
)

// TODO(mc, 2018-01-04): inferring start time from handledAt of first command
// is inadequate; robot starts moving before this timestamp is set
export const getStartTime = createSelector(
  getCommands,
  (commands): ?number => commands.length
    ? commands[0].handledAt
    : null
)

export const getRunTime = createSelector(
  getStartTime,
  (state: State) => session(state).runTime,
  (startTime: ?number, runTime: ?number): string => {
    // TODO(mc, 2018-01-04): gt check is required because of the TODO above
    const runTimeSeconds = (runTime && startTime && runTime > startTime)
      ? Math.floor((runTime - startTime) / 1000)
      : 0

    const hours = padStart(`${Math.floor(runTimeSeconds / 3600)}`, 2, '0')
    const minutes = padStart(`${Math.floor(runTimeSeconds / 60) % 60}`, 2, '0')
    const seconds = padStart(`${runTimeSeconds % 60}`, 2, '0')

    return `${hours}:${minutes}:${seconds}`
  }
)

export function getCalibrationRequest (state: State) {
  return calibration(state).calibrationRequest
}

export function getInstrumentsByMount (state: State) {
  return session(state).instrumentsByMount
}

export const getInstruments = createSelector(
  getInstrumentsByMount,
  (state: State) => calibration(state).probedByMount,
  (state: State) => calibration(state).tipOnByMount,
  (state: State) => getCalibrationRequest(state),
  (
    instrumentsByMount,
    probedByMount,
    tipOnByMount,
    calibrationRequest
  ): Instrument[] => {
    return Object.keys(instrumentsByMount).map((mount) => {
      const instrument = instrumentsByMount[mount]

      const probed = probedByMount[mount] || false
      const tipOn = tipOnByMount[mount] || false
      let calibration: InstrumentCalibrationStatus = 'unprobed'

      // TODO(mc: 2018-01-10): rethink the instrument level "calibration" prop
      // TODO(mc: 2018-01-23): handle probe error state better
      if (calibrationRequest.mount === mount && !calibrationRequest.error) {
        if (calibrationRequest.type === 'MOVE_TO_FRONT') {
          calibration = calibrationRequest.inProgress
            ? 'preparing-to-probe'
            : 'ready-to-probe'
        } else if (calibrationRequest.type === 'PROBE_TIP') {
          if (calibrationRequest.inProgress) {
            calibration = 'probing'
          } else if (!probed) {
            calibration = 'probed-tip-on'
          } else {
            calibration = 'probed'
          }
        }
      }

      return {
        ...instrument,
        calibration,
        probed,
        tipOn
      }
    })
  }
)

// returns the mount of the pipette to use for deckware calibration
// TODO(mc, 2018-02-07): be smarter about the backup case
export const getCalibrator = createSelector(
  getInstruments,
  (instruments): Instrument => {
    const tipOn = instruments.find((i) => i.probed && i.tipOn)

    return tipOn || instruments[0]
  }
)

// TODO(mc, 2018-02-07): remove this selector in favor of the one above
export function getCalibratorMount (state: State): Mount {
  return getCalibrator(state).mount
}

export const getInstrumentsCalibrated = createSelector(
  getInstruments,
  (instruments): boolean => instruments.every((i) => !i.name || i.probed)
)

export function getLabwareBySlot (state: State) {
  return session(state).labwareBySlot
}

export const getLabware = createSelector(
  getLabwareBySlot,
  (state: State) => calibration(state).confirmedBySlot,
  (state: State) => getCalibrationRequest(state),
  (labwareBySlot, confirmedBySlot, calibrationRequest): Labware[] => {
    return Object.keys(labwareBySlot)
      .map((slot) => {
        const labware = labwareBySlot[slot]
        const confirmed = confirmedBySlot[slot] || false
        let calibration: LabwareCalibrationStatus = 'unconfirmed'
        let isMoving = false

        // TODO(mc: 2018-01-10): rethink the labware level "calibration" prop
        if (calibrationRequest.slot === slot && !calibrationRequest.error) {
          const {type, inProgress} = calibrationRequest
          isMoving = inProgress

          if (type === 'MOVE_TO' || type === 'DROP_TIP_AND_HOME') {
            calibration = inProgress
              ? 'moving-to-slot'
              : 'over-slot'
          } else if (
            type === 'PICKUP_AND_HOME' ||
            // update offset picks up and homes with tipracks
            (type === 'UPDATE_OFFSET' && labware.isTiprack)
          ) {
            calibration = inProgress
              ? 'picking-up'
              : 'picked-up'
          } else if (type === 'CONFIRM_TIPRACK' || type === 'UPDATE_OFFSET') {
            calibration = inProgress
              ? 'confirming'
              : 'confirmed'
          }
        }

        return {...labware, calibration, confirmed, isMoving}
      })
  }
)

export function getDeckPopulated (state: State) {
  return calibration(state).deckPopulated
}

export const getUnconfirmedLabware = createSelector(
  getLabware,
  (labware) => labware.filter((lw) => lw.type && !lw.confirmed)
)

export const getTipracks = createSelector(
  getLabware,
  (labware) => labware.filter((lw) => lw.type && lw.isTiprack)
)

export const getNotTipracks = createSelector(
  getLabware,
  (labware) => labware.filter((lw) => lw.type && !lw.isTiprack)
)

export const getUnconfirmedTipracks = createSelector(
  getUnconfirmedLabware,
  (labware) => labware.filter((lw) => lw.type && lw.isTiprack)
)

export const getNextLabware = createSelector(
  getUnconfirmedTipracks,
  getUnconfirmedLabware,
  (tipracks, labware) => tipracks[0] || labware[0]
)

export const getTipracksConfirmed = createSelector(
  getUnconfirmedTipracks,
  (remaining): boolean => remaining.length === 0
)

export const getLabwareConfirmed = createSelector(
  getUnconfirmedLabware,
  (remaining): boolean => remaining.length === 0
)

export function getJogInProgress (state: State): boolean {
  const request = getCalibrationRequest(state)

  return request.type === 'JOG' && request.inProgress
}

export function getOffsetUpdateInProgress (state: State): boolean {
  const request = getCalibrationRequest(state)

  return request.type === 'UPDATE_OFFSET' && request.inProgress
}

export function getJogDistance (state: State): number {
  return calibration(state).jogDistance
}
