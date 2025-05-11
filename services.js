const path = require("path");
const protoLoader = require("@grpc/proto-loader");
const grpc = require("@grpc/grpc-js");

const loadProto = (file) => {
    const PROTO_PATH = path.join(__dirname, 'protos', file);
    const packageDef = protoLoader.loadSync(PROTO_PATH);
    return grpc.loadPackageDefinition(packageDef);
}
// PatientService implementation
const patientProto = loadProto('PatientService.proto').patient;
const vitalProto = loadProto('VitalService.proto').vital;
const alertProto = loadProto('AlertService.proto').alert;
const server = 'localhost:50051';

module.exports = {
    patientProto,
    vitalProto,
    alertProto,
    server
}