import { ImportVendors } from '../types/vendor';

const ErrorMsgs = {
  telemetry: {
    latitude: `Must provide valid latitude.`,
    longitude: `Must provide valid longitude.`,
    device_make: `Device Make must be ${Object.keys(ImportVendors).join(
      ' OR '
    )}`,
    date: `Record of telemetry exists for this Device ID on this Date`,
    device_id: `Device ID does not exist in telemetry table.`,
  },
  metadata: {
    alreadyAttached: 'This device is already assigned to an animal. Unlink this device and try again.',
    missingData: 'You have not provided sufficient data.',
    badMarkings: 'This animal has insufficient marking information to uniquely identify it.',
  },
  fields: {
    code: {
      desc: 'This value is not a valid code for this field.',
      help: 'This field must contain a value from the list of acceptable values.'
    },
    date: {
      desc: 'This field must be a valid date format.',
      help: 'You have incorrectly formatted this date field. One way you can ensure correct formatting for a cell of this type is to change the Number Format dropdown in Excel.',
    },
    number: {
      desc: 'This field must be a numeric value.',
      help:
        'This field is set to only accept numbers, including integers and floating points. Ensure you have not included any special characters.',
    },
    bool: {
      desc: 'Set this field to either TRUE or FALSE.',
      help: 'Set this field to either TRUE or FALSE.',
    }
  }
};


const importMessages = {
  warningMessages: {
    previousDeployment: {
      message: (device_id) => `I am re-using Device ID ${device_id} for a new deployment.`,
      help: 'We found records of other deployments for this device ID in our database, but none of them overlapped the time period you are trying to import.' + 
      ' You can safely import this deployment if you are sure it differs from what\'s already been tracked.'
    },
    manyDeviceOneAnimal: {
      message: 'I am attaching multiple devices to this animal over the same time span.',
      help: 'Our system allows animals to wear multiple devices over the same time span.' +
      ' By completing this import, you will NOT be removing the existing device and replacing it with this new device.'+
      ' Please ensure you really wish for the animal to wear two devices at once.'
    },
    matchingMarkings: {
      message: 'I am importing a new animal, even though this same combination of markings identifies an existing animal.',
      help: (species) => `We already have records of a ${species} that matches the markings you have provided. 
      However, we are inferring that a seperate animal be created. 
      This can happen if you provide a mortality date that predates the original capture date of an existing critter, 
      or you provide a deployment date after the mortality date of the existing critter.`
    }
  },
}

export { ErrorMsgs, importMessages };
