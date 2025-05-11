const express = require('express');
const bodyParser = require('body-parser');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const loadProto = (file) => {
  const PROTO_PATH = path.join(__dirname, 'protos', file);
  const packageDef = protoLoader.loadSync(PROTO_PATH);
  return grpc.loadPackageDefinition(packageDef);
}

// PatientService implementation
const patientProto = loadProto('PatientService.proto').patient;
const vitalProto = loadProto('VitalService.proto').vital;
const alertProto = loadProto('AlertService.proto').alert;

const patientClient = new patientProto.PatientService('localhost:50051', grpc.credentials.createInsecure());
const vitalClient = new vitalProto.VitalService('localhost:50051', grpc.credentials.createInsecure());
const alertClient = new alertProto.AlertService('localhost:50051', grpc.credentials.createInsecure());

// Homepage: fetch all patients, their vitals, and alerts
app.get('/', (req, res) => {
  patientClient.GetAllPatients({}, (err, patientList) => {
    if (err) return res.render('index', { patients: [] });
    if (!patientList || !patientList.patients) return res.render('index', { patients: [] });

    const tasks = patientList.patients.map(p => {
      return new Promise(resolve => {
        vitalClient.GetLatestVitals({ id: p.id }, (err1, vitals) => {
          alertClient.GetAlerts({ id: p.id }, (err2, alerts) => {
            console.log(alerts)
            resolve({
              ...p,
              vitals: vitals || { heartRate: '-', temperature: '-', bloodPressure: '-' },
              alerts: alerts?.alerts || []
            });
          });
        });
      });
    });

    Promise.all(tasks).then(results => {
      res.render('index', { patients: results });
    });
  });
});

// Register new patient via gRPC
app.post('/register', (req, res) => {
  const { name, age } = req.body;
  patientClient.RegisterPatient({ name, age: parseInt(age) }, (err, response) => {
    if (err) console.error("RegisterPatient error:", err);
    res.redirect('/');
  });
});

// Record new vitals via gRPC
app.post('/vitals', (req, res) => {
  const { patientId, heartRate, temperature, bloodPressure } = req.body;
  const payload = {
    patientId: String(patientId),
    bloodPressure: parseFloat(bloodPressure),
    heartRate: parseFloat(heartRate),
    temperature: parseFloat(temperature),
  };

  vitalClient.RecordVitals(payload, (err) => {
    if (err) {
      console.error("RecordVitals error:", err);
      return res.status(500).send("Failed to record vitals");
    }

    alertClient.CheckVitals(payload, (err1, alertResponse) => {
      if (err1) {
        console.error("CheckVitals error:", err1);
        return res.status(500).send("Failed to check vitals");
      }

      if (alertResponse.triggered) {
        console.log("Alert triggered:", alertResponse.message);
      }
    });

    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Web app running at http://localhost:3000');
});
