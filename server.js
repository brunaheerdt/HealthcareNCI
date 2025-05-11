const grpc = require('@grpc/grpc-js');
const {v4: uuidv4} = require('uuid');
const { patientProto, vitalProto, alertProto, server} = require('./services');
const {logMessage} = require("./logger");

// In-memory storage
const patients = {};
const vitals = {};
const alerts = {};

// gRPC server
const grpcServer = new grpc.Server();

const CheckVitals = (call, callback) => {
    const {patientId, heartRate, temperature, bloodPressure} = call.request;
    const messages = [];
    if (heartRate > 120) messages.push("High heart rate");
    if (temperature > 38.5) messages.push("High temperature");
    if (bloodPressure > 140) messages.push("High blood pressure");

    const response = {
        triggered: messages.length > 0,
        message: messages.join(", ")
    };

    if (response.triggered) {
        if (!alerts[patientId]) {
            alerts[patientId] = [];
        }
        alerts[patientId].push({
            message: response.message,
            timestamp: Date.now()
        });
        // Log the alert
        logMessage(`ALERT: ${JSON.stringify(alerts[patientId])}`);
    }

    callback(null, response);
}

const GetAlerts = (call, callback) => {
    callback(null, {alerts: alerts[call.request.id] || []});
}

const RegisterPatient = (call, callback) => {
    const id = uuidv4();
    const newPatient = {id, name: call.request.name, age: call.request.age};
    patients[id] = newPatient;
    vitals[id] = null;
    alerts[id] = [];
    // Log the alert
    logMessage(`Registering Patient: ${JSON.stringify(newPatient)}`);
    callback(null, {id, message: "Patient registered successfully"});
}
const GetAllPatients = (_, callback) => {
    callback(null, {patients: Object.values(patients)});
}

const RecordVitals = (call, callback) => {
    const {patientId, heartRate, temperature, bloodPressure} = call.request;

    if (!patientId || !heartRate || !temperature || !bloodPressure) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "Missing required fields"
        });
    }

    const data = {...call.request, timestamp: Date.now()};
    vitals[data.patientId] = data;

    logMessage(`Received vitals: ${JSON.stringify(data)}`);
    callback(null, {message: "Vitals recorded"});
}
const GetLatestVitals = (call, callback) => {
    const record = vitals[call.request.id] || {};
    callback(null, record);
}

// AlertService
grpcServer.addService(alertProto.AlertService.service, {CheckVitals, GetAlerts});

// PatientService
grpcServer.addService(patientProto.PatientService.service, {RegisterPatient, GetAllPatients});

// VitalService
grpcServer.addService(vitalProto.VitalService.service, {RecordVitals, GetLatestVitals});

// Start gRPC server
grpcServer.bindAsync(server, grpc.ServerCredentials.createInsecure(), () => {
    grpcServer.start();
    console.log("gRPC server running on port 50051");
});