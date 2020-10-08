class Collar {
  constructor(
    device_id,
    make,
    model,
    deployment_status,
    collar_status,
    collar_type,
    deactivated,
    radio_frequency,
    malfunction_date,
    max_transmission_date,
    reg_key,
    retreival_date,
    satellite_network
  ) {
    this.device_id = device_id,
    this.make = make,
    this.model = model,
    this.deployment_status = deployment_status,
    this.collar_status = collar_status,
    this.collar_type = collar_type,
    this.deactivated = deactivated,
    this.radio_frequency = radio_frequency,
    this.malfunction_date = malfunction_date,
    this.max_transmission_date = max_transmission_date,
    this.reg_key = reg_key,
    this.retreival_date = retreival_date,
    this.satellite_network = satellite_network
  }
}
module.exports = {
  Collar
}
