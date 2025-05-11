const grpc = require('@grpc/grpc-js');
const {v4: uuidv4} = require('uuid');
const {patientProto, vitalProto, alertProto, server} = require('./services');
const {logMessage} = require("./logger");

// In-memory storage
const patients = {};
const vitals = {};
const alerts = {};

// gRPC server
const grpcServer = new grpc.Server();

// ### PatientService implementation ###
// Register a new patient
const RegisterPatient = (call, callback) => {
    const id = uuidv4();
    const newPatient = {id, name: call.request.name, age: call.request.age};
    patients[id] = newPatient;
    // Initialize vitals and alerts for the new patient
    vitals[id] = null;
    alerts[id] = [];
    // Log the alert
    logMessage(`Registering Patient: ${JSON.stringify(newPatient)}`);
    callback(null, {id, message: "Patient registered successfully"});
}
// Get all patients list
const GetAllPatients = (_, callback) => {
    callback(null, {patients: Object.values(patients)});
}

// ### VitalService implementation ###
// Check vitals for a patient and trigger alerts if necessary
const CheckVitals = (call, callback) => {
    const {patientId, heartRate, temperature, bloodPressure} = call.request;
    const messages = [];

    // check if vitals are above threshold, if they are, add to messages as alert
    if (heartRate > 120) messages.push("High heart rate");
    if (temperature > 38.5) messages.push("High temperature");
    if (bloodPressure > 140) messages.push("High blood pressure");

    // create response object
    const response = {
        triggered: messages.length > 0,
        message: messages.join(", ")
    };

    // if alert is triggered, add to alerts
    if (response.triggered) {
        if (!alerts[patientId]) {
            alerts[patientId] = [];
        }
        // add alert to alerts storage
        alerts[patientId].push({
            message: response.message,
            timestamp: Date.now()
        });
        // Log the alert
        logMessage(`ALERT: ${JSON.stringify(alerts[patientId])}`);
    } else {
        logMessage(`No alert triggered for ${patientId}`);
    }

    callback(null, response);
}
// Get all alerts for a patient
const GetAlerts = (call, callback) => {
    callback(null, {alerts: alerts[call.request.id] || []});
}

// ### VitalService implementation ###
// Record vitals for a patient
const RecordVitals = (call, callback) => {
    const {patientId, heartRate, temperature, bloodPressure} = call.request;

    // check if all required fields are present
    if (!patientId || !heartRate || !temperature || !bloodPressure) {
        logMessage(`RecordVitals - Missing required fields: ${JSON.stringify(call.request)}`);
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "Missing required fields"
        });
    }
    // create vitals object
    const data = {...call.request, timestamp: Date.now()};
    // store vitals in memory
    vitals[data.patientId] = data;

    logMessage(`Received vitals: ${JSON.stringify(data)}`);
    callback(null, {message: "Vitals recorded"});
}
// Get latest vitals for a patient
const GetLatestVitals = (call, callback) => {
    const record = vitals[call.request.id] || {};
    callback(null, record);
}

// Add AlertService to gRPC server
grpcServer.addService(alertProto.AlertService.service, {CheckVitals, GetAlerts});

// Add PatientService to gRPC server
grpcServer.addService(patientProto.PatientService.service, {RegisterPatient, GetAllPatients});

// Add VitalService to gRPC server
grpcServer.addService(vitalProto.VitalService.service, {RecordVitals, GetLatestVitals});

// Start gRPC server, binding to localhost:50051
grpcServer.bindAsync(server, grpc.ServerCredentials.createInsecure(), () => {
    grpcServer.start();
    console.log("gRPC server running on port 50051");
});