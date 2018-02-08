// @flow
// robot calibration state and reducer
// TODO(mc, 2018-01-10): refactor to use combineReducers
import mapValues from 'lodash/mapValues'

import type {Mount, Slot} from '../types'
import {actionTypes} from '../actions'
import type {
  Action,
  ConfirmProbedAction,
  PipetteCalibrationAction,
  LabwareCalibrationAction,
  CalibrationSuccessAction,
  CalibrationFailureAction
} from '../actions'

import {
  JOG_DISTANCE_SLOW_MM,
  JOG_DISTANCE_FAST_MM
} from '../constants'

// calibration request types
// TODO(mc, 2018-01-10): these should match up with the request actions;
//   explore how to link these concepts effectively
type CalibrationRequestType =
  | ''
  | 'MOVE_TO_FRONT'
  | 'PROBE_TIP'
  | 'MOVE_TO'
  | 'JOG'
  | 'PICKUP_AND_HOME'
  | 'DROP_TIP_AND_HOME'
  | 'CONFIRM_TIPRACK'
  | 'UPDATE_OFFSET'

type CalibrationRequest = {
  type: CalibrationRequestType,
  mount?: Mount,
  slot?: Slot,
  inProgress: boolean,
  error: ?{message: string},
}

export type State = {
  +deckPopulated: boolean,
  +jogDistance: number,

  +probedByMount: {[Mount]: boolean},
  +tipOnByMount: {[Mount]: boolean},

  +confirmedBySlot: {[Slot]: boolean},

  +calibrationRequest: CalibrationRequest
}

// TODO(mc, 2018-01-11): replace actionType constants with Flow types
const {
  SESSION,
  DISCONNECT_RESPONSE,
  SET_DECK_POPULATED,
  MOVE_TO_FRONT,
  MOVE_TO_FRONT_RESPONSE,
  PROBE_TIP,
  PROBE_TIP_RESPONSE,
  TOGGLE_JOG_DISTANCE,
  CONFIRM_LABWARE
} = actionTypes

const INITIAL_STATE: State = {
  deckPopulated: true,
  jogDistance: JOG_DISTANCE_SLOW_MM,

  // TODO(mc, 2018-01-22): combine these into subreducer
  probedByMount: {},
  tipOnByMount: {},

  confirmedBySlot: {},

  calibrationRequest: {type: '', inProgress: false, error: null}
}

export default function calibrationReducer (
  state: State = INITIAL_STATE,
  action: Action
): State {
  switch (action.type) {
    case 'robot:CONFIRM_PROBED':
      return handleConfirmProbed(state, action)

    case 'robot:MOVE_TO':
      return handleMoveTo(state, action)

    case 'robot:MOVE_TO_SUCCESS':
      return handleMoveToSuccess(state, action)

    case 'robot:MOVE_TO_FAILURE':
      return handleMoveToFailure(state, action)

    case 'robot:JOG':
      return handleJog(state, action)

    case 'robot:JOG_SUCCESS':
      return handleJogSuccess(state, action)

    case 'robot:JOG_FAILURE':
      return handleJogFailure(state, action)

    case 'robot:PICKUP_AND_HOME':
      return handlePickupAndHome(state, action)

    case 'robot:PICKUP_AND_HOME_SUCCESS':
      return handlePickupAndHomeSuccess(state, action)

    case 'robot:PICKUP_AND_HOME_FAILURE':
      return handlePickupAndHomeFailure(state, action)

    case 'robot:DROP_TIP_AND_HOME':
      return handleDropTipAndHome(state, action)

    case 'robot:DROP_TIP_AND_HOME_SUCCESS':
      return handleDropTipAndHomeSuccess(state, action)

    case 'robot:DROP_TIP_AND_HOME_FAILURE':
      return handleDropTipAndHomeFailure(state, action)

    case 'robot:CONFIRM_TIPRACK':
      return handleConfirmTiprack(state, action)

    case 'robot:CONFIRM_TIPRACK_SUCCESS':
      return handleConfirmTiprackSuccess(state, action)

    case 'robot:CONFIRM_TIPRACK_FAILURE':
      return handleConfirmTiprackFailure(state, action)

    case 'robot:UPDATE_OFFSET':
      return handleUpdateOffset(state, action)

    case 'robot:UPDATE_OFFSET_SUCCESS':
      return handleUpdateOffsetSuccess(state, action)

    case 'robot:UPDATE_OFFSET_FAILURE':
      return handleUpdateOffsetFailure(state, action)

    // TODO(mc, 20187-01-26): caution - not covered by flow yet
    case DISCONNECT_RESPONSE: return handleDisconnectResponse(state, action)
    case SESSION: return handleSession(state, action)
    case SET_DECK_POPULATED: return handleSetDeckPopulated(state, action)
    case MOVE_TO_FRONT: return handleMoveToFront(state, action)
    case MOVE_TO_FRONT_RESPONSE: return handleMoveToFrontResponse(state, action)
    case PROBE_TIP: return handleProbeTip(state, action)
    case PROBE_TIP_RESPONSE: return handleProbeTipResponse(state, action)
    case TOGGLE_JOG_DISTANCE: return handleToggleJog(state, action)
    case CONFIRM_LABWARE: return handleConfirmLabware(state, action)
  }

  return state
}

function handleDisconnectResponse (state: State, action: any): State {
  if (action.error) return state
  return INITIAL_STATE
}

function handleSession (state: State, action: any): State {
  return INITIAL_STATE
}

function handleSetDeckPopulated (state: State, action: any): State {
  return {...state, deckPopulated: action.payload}
}

function handleMoveToFront (state: State, action: any): State {
  if (!action.payload || !action.payload.instrument) return state

  const {payload: {instrument: mount}} = action

  return {
    ...state,
    deckPopulated: false,
    calibrationRequest: {
      type: 'MOVE_TO_FRONT',
      inProgress: true,
      error: null,
      mount
    }
  }
}

function handleMoveToFrontResponse (state: State, action: any): State {
  const {payload, error} = action

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: error
        ? payload
        : null
    }
  }
}

function handleProbeTip (state: State, action: any) {
  if (!action.payload || !action.payload.instrument) return state

  const {payload: {instrument}} = action

  return {
    ...state,
    calibrationRequest: {
      type: 'PROBE_TIP',
      mount: instrument,
      inProgress: true,
      error: null
    },
    probedByMount: {
      ...state.probedByMount,
      [instrument]: false
    }
  }
}

function handleProbeTipResponse (state: State, action: any) {
  const {payload, error} = action

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: error
        ? payload
        : null
    }
  }
}

function handleConfirmProbed (
  state: State,
  action: ConfirmProbedAction
): State {
  return {
    ...state,
    probedByMount: {...state.probedByMount, [action.payload]: true}
  }
}

function handleMoveTo (state: State, action: LabwareCalibrationAction): State {
  const {mount, slot} = action.payload

  return {
    ...state,
    deckPopulated: true,
    calibrationRequest: {
      type: 'MOVE_TO',
      inProgress: true,
      error: null,
      mount,
      slot
    }
  }
}

function handleMoveToSuccess (
  state: State,
  action: CalibrationSuccessAction
): State {
  const {calibrationRequest: {slot}} = state
  if (!slot) return state

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: null
    }
  }
}

function handleMoveToFailure (
  state: State,
  action: CalibrationFailureAction
): State {
  const {calibrationRequest: {slot}} = state
  if (!slot) return state

  const error = action.payload

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: error
    }
  }
}

function handlePickupAndHome (
  state: State,
  action: LabwareCalibrationAction
): State {
  const {payload: {mount, slot}} = action

  return {
    ...state,
    deckPopulated: true,
    calibrationRequest: {
      type: 'PICKUP_AND_HOME',
      inProgress: true,
      error: null,
      mount,
      slot
    }
  }
}

function handlePickupAndHomeSuccess (
  state: State,
  action: CalibrationSuccessAction
): State {
  const {calibrationRequest: {mount, slot}} = state
  if (!slot || !mount) return state

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: null
    },
    // assume that only one tip can be on at a time
    tipOnByMount: {
      ...mapValues(state.tipOnByMount, (value: boolean, key: Mount) => false),
      [mount]: true
    }
  }
}

function handlePickupAndHomeFailure (
  state: State,
  action: CalibrationFailureAction
): State {
  const {calibrationRequest: {mount, slot}} = state
  if (!slot || !mount) return state

  const error = action.payload

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error
    }
  }
}

function handleDropTipAndHome (
  state: State,
  action: LabwareCalibrationAction
): State {
  const {payload: {mount, slot}} = action

  return {
    ...state,
    calibrationRequest: {
      type: 'DROP_TIP_AND_HOME',
      inProgress: true,
      error: null,
      mount,
      slot
    }
  }
}

function handleDropTipAndHomeSuccess (
  state: State,
  action: CalibrationSuccessAction
): State {
  const {calibrationRequest: {mount, slot}} = state
  if (!slot || !mount) return state

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: null
    },
    tipOnByMount: {
      ...state.tipOnByMount,
      [mount]: false
    }
  }
}

function handleDropTipAndHomeFailure (
  state: State,
  action: CalibrationFailureAction
): State {
  const {calibrationRequest: {mount, slot}} = state
  if (!slot || !mount) return state

  const error = action.payload

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error
    }
  }
}

function handleConfirmTiprack (
  state: State,
  action: LabwareCalibrationAction
): State {
  const {payload: {mount, slot}} = action

  return {
    ...state,
    calibrationRequest: {
      type: 'CONFIRM_TIPRACK',
      inProgress: true,
      error: null,
      mount,
      slot
    }
  }
}

function handleConfirmTiprackSuccess (
  state: State,
  action: CalibrationSuccessAction
): State {
  const {calibrationRequest: {mount, slot}} = state
  if (!slot || !mount) return state

  const tipOn = action.payload.tipOn || false

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: null
    },
    tipOnByMount: {
      ...state.tipOnByMount,
      [mount]: tipOn
    },
    confirmedBySlot: {
      ...state.confirmedBySlot,
      [slot]: true
    }
  }
}

function handleConfirmTiprackFailure (
  state: State,
  action: CalibrationFailureAction
): State {
  const {calibrationRequest: {mount, slot}} = state
  if (!slot || !mount) return state

  const error = action.payload

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error
    }
  }
}

function handleToggleJog (state: State, action: any) {
  return {
    ...state,
    jogDistance: state.jogDistance === JOG_DISTANCE_SLOW_MM
      ? JOG_DISTANCE_FAST_MM
      : JOG_DISTANCE_SLOW_MM
  }
}

function handleJog (state: State, action: PipetteCalibrationAction): State {
  const {payload: {mount}} = action

  return {
    ...state,
    calibrationRequest: {
      // make sure we hang on to any state from a previous labware calibration
      ...state.calibrationRequest,
      type: 'JOG',
      inProgress: true,
      error: null,
      mount
    }
  }
}

function handleJogSuccess (
  state: State,
  action: CalibrationSuccessAction
): State {
  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: null
    }
  }
}

function handleJogFailure (
  state: State,
  action: CalibrationFailureAction
): State {
  const error = action.payload

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error
    }
  }
}

function handleUpdateOffset (
  state: State,
  action: LabwareCalibrationAction
): State {
  const {payload: {mount, slot}} = action

  return {
    ...state,
    calibrationRequest: {
      type: 'UPDATE_OFFSET',
      inProgress: true,
      error: null,
      mount,
      slot
    }
  }
}

function handleUpdateOffsetSuccess (
  state: State,
  action: CalibrationSuccessAction
): State {
  const {calibrationRequest: {mount, slot}} = state
  if (!mount || !slot) return state

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error: null
    },
    confirmedBySlot: {
      ...state.confirmedBySlot,
      [slot]: true
    }
  }
}

function handleUpdateOffsetFailure (
  state: State,
  action: CalibrationFailureAction
): State {
  const {calibrationRequest: {mount, slot}} = state
  if (!mount || !slot) return state

  const error = action.payload

  return {
    ...state,
    calibrationRequest: {
      ...state.calibrationRequest,
      inProgress: false,
      error
    }
  }
}

function handleConfirmLabware (state, action: any) {
  if (!action.payload || !action.payload.labware) return state

  const {payload: {labware: slot}} = action

  return {
    ...state,
    confirmedBySlot: {...state.confirmedBySlot, [slot]: true}
  }
}
