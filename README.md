# Smart Healthcare System

This project is a Smart Healthcare System that uses gRPC for backend communication and a web interface for managing patients, recording vitals, and monitoring alerts.

## Features
- Register new patients.
- Record and monitor patient vitals (heart rate, temperature, blood pressure).
- Trigger alerts based on abnormal vitals.
- View all patients, their latest vitals, and alerts via a web interface.

## Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>

2. Install dependencies:  
    <pre>npm install </pre>


## Starting the gRPC Server

1. Navigate to the project directory. 
2. Start the gRPC server:
    <pre>npm run start:server </pre>
3. The gRPC server will run on localhost:50051.


## Starting the Web Server
1. Navigate to the project directory.
2. Start the web server:
    <pre>npm run start:client </pre>
3. The web server will run on http://localhost:3000.


## Usage
1. Open the web interface in your browser at http://localhost:3000.
2. Use the form to register new patients. 
3. Record vitals for patients and monitor alerts. 
4. View all patients, their latest vitals, and any triggered alerts.


## Technologies Used
1. JavaScript
2. Node.js 
3. gRPC 
4. Express.js 
5. EJS (Embedded JavaScript templates)

## gRPC Services
1. PatientService: Manages patient data and vitals.
2. VitalsService: Records and checks patient vitals.
3. AlertService: Handles alert notifications.

## gRPC Methods
1. RegisterPatient: Registers a new patient.
2. RecordVitals: Records vitals for a patient.
3. CheckVitals: Checks vitals and triggers alerts if necessary.
4. GetAllPatients: Retrieves all patients and their latest vitals.
5. GetAlerts: Retrieves all alerts for a patient.