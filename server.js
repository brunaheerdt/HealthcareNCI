const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// In-memory storage
const patients = {
};
const vitals = {};
const alerts = {};

const loadProto = (file) => {
  const PROTO_PATH = path.join(__dirname, 'protos', file);
  const packageDef = protoLoader.loadSync(PROTO_PATH);
  return grpc.loadPackageDefinition(packageDef);
}

// PatientService implementation
const patientProto = loadProto('PatientService.proto').patient;
const vitalProto = loadProto('VitalService.proto').vital;
const alertProto = loadProto('AlertService.proto').alert;

// gRPC server
const grpcServer = new grpc.Server();

// AlertService
grpcServer.addService(alertProto.AlertService.service, {
  CheckVitals: (call, callback) => {
    const { patientId, heartRate, temperature, bloodPressure } = call.request;
    console.log('call.request', call.request)
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
    }

    callback(null, response);
  },
  GetAlerts: (call, callback) => {
    callback(null, { alerts: alerts[call.request.id] || [] });
  }
});

// PatientService
grpcServer.addService(patientProto.PatientService.service, {
  RegisterPatient: (call, callback) => {
    const id = uuidv4();
    const newPatient = { id, name: call.request.name, age: call.request.age };
    patients[id] = newPatient;
    vitals[id] = null;
    alerts[id] = [];
    callback(null, { id, message: "Patient registered successfully" });
  },
  GetAllPatients: (_, callback) => {
    callback(null, { patients: Object.values(patients) });
  }
});

// VitalService
grpcServer.addService(vitalProto.VitalService.service, {
  RecordVitals: (call, callback) => {
    console.log("Raw request metadata:", call.metadata.getMap());
    console.log("Raw request payload:", call.request);

    const { patientId, heartRate, temperature, bloodPressure } = call.request;

    if (!patientId || !heartRate ||!temperature || !bloodPressure) {
      console.error("Missing fields in the request:", call.request);
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "Missing required fields"
      });
    }

    const data = { ...call.request, timestamp: Date.now() };
    vitals[data.patientId] = data;

    console.log("Vitals stored:", vitals);
    callback(null, { message: "Vitals recorded" });
  },
  GetLatestVitals: (call, callback) => {
    const record = vitals[call.request.id] || {};
    callback(null, record);
  }
});

// Start gRPC server
grpcServer.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  grpcServer.start();
  console.log("gRPC server running on port 50051");
});