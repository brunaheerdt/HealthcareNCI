const express = require('express');
const bodyParser = require('body-parser');
const grpc = require('@grpc/grpc-js');
const path = require('path');
const app = express();
const { patientProto, vitalProto, alertProto, server } = require('./services');

// Express serve middleware to create a web server
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// create gRPC clients
const patientClient = new patientProto.PatientService(server, grpc.credentials.createInsecure());
const vitalClient = new vitalProto.VitalService(server, grpc.credentials.createInsecure());
const alertClient = new alertProto.AlertService(server, grpc.credentials.createInsecure());

// Homepage: fetch all patients, their vitals, and alerts
app.get('/', (req, res) => {
  // use patientClient to get all patients
  patientClient.GetAllPatients({}, (err, patientList) => {
    if (err) return res.render('index', { patients: [] });
    if (!patientList || !patientList.patients) return res.render('index', { patients: [] });

    // create an array of promises to fetch vitals and alerts for each patient
    const tasks = patientList.patients.map(p => {
      // For each patient, use vitalClient to get latest vitals and alertClient to get alerts
      return new Promise(resolve => {
        // use vitalClient to get latest vitals
        vitalClient.GetLatestVitals({ id: p.id }, (err1, vitals) => {
          // use alertClient to get alerts
          alertClient.GetAlerts({ id: p.id }, (err2, alerts) => {
            resolve({
              ...p,
              vitals: vitals || { heartRate: '-', temperature: '-', bloodPressure: '-' },
              alerts: alerts?.alerts || []
            });
          });
        });
      });
    });

    // wait for all promises to resolve
    Promise.all(tasks).then(results => {
        // render the index page with the results
      res.render('index', { patients: results });
    });
  });
});

// Register new patient via gRPC
app.post('/register', (req, res) => {
  // get name and age from request body
  const { name, age } = req.body;
  // use patientClient to register the new patient
  patientClient.RegisterPatient({ name, age: parseInt(age) }, (err, response) => {
    if (err) console.error("RegisterPatient error:", err);

    // redirect to homepage
    res.redirect('/');
  });
});

// Record new vitals via gRPC
app.post('/vitals', (req, res) => {
  // get vitals data from request body
  const { patientId, heartRate, temperature, bloodPressure } = req.body;
  // create payload for gRPC call
  const payload = {
    patientId: String(patientId),
    bloodPressure: parseFloat(bloodPressure),
    heartRate: parseFloat(heartRate),
    temperature: parseFloat(temperature),
  };
  // use vitalClient to record vitals
  vitalClient.RecordVitals(payload, (err) => {
    if (err) {
      console.error("RecordVitals error:", err);
      return res.status(500).send("Failed to record vitals");
    }

    // check vitals and trigger alerts if necessary using alertClient
    alertClient.CheckVitals(payload, (err1, alertResponse) => {
      if (err1) {
        console.error("CheckVitals error:", err1);
        return res.status(500).send("Failed to check vitals");
      }
    });

    // redirect to homepage
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Web app running at http://localhost:3000');
});
