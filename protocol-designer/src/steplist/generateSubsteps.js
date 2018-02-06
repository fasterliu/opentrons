// @flow
import type {Command, StepType, StepIdType, FormData, ProcessedFormData} from './types' /* StepSubItemData, StepIdType */
import flatMap from 'lodash/flatMap'
import zip from 'lodash/zip'

export type ValidFormAndErrors = {
  errors: {[string]: string}, // was [$Keys<FormData>]: string, but that's too strict TODO
  validatedForm: ProcessedFormData
} // TODO rename and move to types?

export const generateNewForm = (stepId: StepIdType, stepType: StepType) => {
  const baseForm = {
    id: stepId,
    stepType: stepType
  }

  if (stepType === 'transfer') {
  // TODO: other actions
    return {
      ...baseForm,
      'aspirate--change-tip': 'once'
      // TODO: rest of blank fields? Default values?
    }
  }
  console.warn('generateNewForm: Only transfer forms are supported now. TODO.')
  return baseForm
}

export function validateAndProcessForm (formData: FormData): any { // TODO type should be ValidFormAndErrors
  // This makes sure required fields are present, and parses strings to numbers where needed.
  // It doesn't do any logic combining the fields.
  type ValidationOut<B> = { // TODO rename
    errors: Array<string>,
    value: B
  }

  type ValidatorFn<A, B> = (value: A, name: string) => ValidationOut<B>

  type ValidationAPI = {
    dataName: string, // $Keys<ProcessedFormData>,
    formFieldName: string, // $Keys<FormData>,
    validators: Array<ValidatorFn<any, any>> // not really validators, more like value casters with error reporting?
  }

  function mustExist<A> (value: A, name: string): ValidationOut<A> {
    return {
      errors: (value !== 0 && !value) ? ['is required'] : [],
      value
    }
  }

  function toNumber (value: string, name: string): ValidationOut<number> {
    const num = parseFloat(value)

    return {
      errors: isNaN(num) ? ['must be a number'] : [],
      value: num
    }
  }

  function nonZero (value: number, name: string): ValidationOut<number> {
    return {
      errors: value === 0 ? ['must be greater than zero'] : [],
      value
    }
  }

  function splitWells (value: string, name: string): ValidationOut<Array<string>> {
    mustExist(value, name)
    return {
      errors: mustExist(value, name).errors,
      value: value ? value.split(',') : [value]
    }
  }

  type Field = {
    formFieldName: string,
    dataName: string,
    validators: any
  }

  // TODO Ian 2018-01-31 wow I cannot Flow type this reduce
  function validateIt (fields: Array<ValidationAPI>) {
    // go thru all the fields of the form
    const fieldsAndErrors = fields.reduce((acc, field: Field) => {
      const {formFieldName, dataName, validators} = field
      // go thru all the validators for a field
      const fieldResult = validators.reduce((prevResult, validatorFn) => {
        const subresult = validatorFn(prevResult.value, dataName)
        return {
          errors: [...prevResult.errors, ...subresult.errors],
          value: subresult.value
        }
      },
      {errors: [], value: formData[formFieldName]}
      )

      return {
        errors: {
          ...acc.errors,
          [dataName]: fieldResult.errors.length
            ? fieldResult.errors
            : undefined // skip field if there are no errors
        },
        validatedForm: {...acc.validatedForm, [dataName]: fieldResult.value}
      }
    },
    {errors: {}, validatedForm: {stepType: formData.stepType}})

    return fieldsAndErrors
  }

  if (formData.stepType === 'transfer') {
    return validateIt([
      {
        dataName: 'pipette',
        formFieldName: 'aspirate--pipette',
        validators: [mustExist]
      },
      {
        dataName: 'sourceWells',
        formFieldName: 'aspirate--wells',
        validators: [splitWells]
      },
      {
        dataName: 'destWells',
        formFieldName: 'dispense--wells',
        validators: [splitWells]
      },
      {
        dataName: 'sourceLabware',
        formFieldName: 'aspirate--labware',
        validators: [mustExist]
      },
      {
        dataName: 'destLabware',
        formFieldName: 'dispense--labware',
        validators: [mustExist]
      },
      {
        dataName: 'volume',
        formFieldName: 'dispense--volume',
        validators: [toNumber, nonZero]
      }
    ])
  }

  if (formData.stepType === 'pause') {
    const hours = parseFloat(formData['pause-hour']) || 0
    const minutes = parseFloat(formData['pause-minute']) || 0
    const seconds = parseFloat(formData['pause-second']) || 0
    const totalSeconds = hours * 360 + minutes * 60 + seconds

    return {
      errors: {
        'pause-for-amount-of-time': (!formData['pause-for-amount-of-time'])
          ? ['Pause for amount of time vs pause until user input is required']
          : undefined,
        'pause-times': (
          formData['pause-for-amount-of-time'] === 'true' &&
          (totalSeconds <= 0)
        )
          ? ['Must include hours, minutes, or seconds']
          : undefined
      },
      validatedForm: {
        stepType: formData.stepType,
        waitForUserInput: formData['pause-for-amount-of-time'] === 'false',
        totalSeconds,
        hours,
        minutes,
        seconds,
        'message': formData['pause-message']
      }
    }
  }

  // TODO
  return {
    errors: {
      'form': ['Unsupported step type: ' + formData.stepType]
    },
    validatedForm: {}
  }
}

export function generateCommands (data: ProcessedFormData): Array<Command> {
  if (data.stepType === 'transfer') {
    // TODO: this should be done in validation/preprocessing step
    const {sourceWells, destWells, volume, pipette, sourceLabware, destLabware} = data

    if (sourceWells.length !== destWells.length) {
      throw new Error('generateSubsteps expected matching N:N source:dest wells for transfer')
    }

    // TODO strings should already be numbers, validation should already happen
    // TODO handle touch tip
    return flatMap(zip(sourceWells, destWells), ([sourceWell, destWell]): Array<Command> => [
      {
        commandType: 'aspirate',
        volume, // TODO add dispense volume etc
        pipette,
        labware: sourceLabware,
        well: sourceWell
      },
      {
        commandType: 'dispense',
        volume,
        pipette,
        labware: destLabware,
        well: destWell
      }
    ])
  }
  console.warn('generateCommands only supports transfer, got: ' + data.stepType)
  return [] // TODO
}

// export function generateSubsteps (): Array<StepSubItemData> {
//   // TODO: create substeps from formData. It doesn't show all the aspirate/dispenses because it ignores mix, etc.
//   return {}
// }