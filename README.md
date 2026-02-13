# Student Emotional Feedback System - Setup Guide

This project consists of a React Frontend (`client`) and a Node.js Backend (`server`).

## Prerequisites
- Node.js installed
- A Firebase Project (Free tier)

## Step 1: Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. **Authentication**: Enable "Email/Password" sign-in method.
4. **Firestore Database**: Create a database in "Test Mode".
5. **Client Configuration**:
   - Go to Project Settings.
   - Register a "Web App".
   - Copy the `firebaseConfig` object.
   - Paste it into `client/src/firebaseConfig.js`.
6. **Server Configuration**:
   - Go to Project Settings -> Service Accounts.
   - Click "Generate new private key".
   - Rename the downloaded file to `serviceAccountKey.json`.
   - Move this file into the `server/` folder.

## Step 2: Running the Server
1. Open a terminal in `server/`.
2. Run `npm install` (if not done).
3. Run `npm start`.
   - Server runs on `http://localhost:5000`.

## Step 3: Running the Client
1. Open a new terminal in `client/`.
2. Run `npm install` (if not done).
3. Run `npm start`.
   - Browser opens at `http://localhost:3000`.

## Step 4: Using the App
1. **Register**: Go to the app and register as a new user. Default role is 'Student'.
2. **Student**: Log in and submit feedback.
3. **Admin Setup**: 
   - Since there is no UI to "promote" the first admin, you must manually edit the Database or use the provided API logic.
   - **Easiest way for viva**:
     - Register a user (e.g., `admin@test.com`).
     - In `server/index.js`, there is an endpoint `/api/set-role`. You can use Postman to call this, OR simply manually add a `customClaim` using a script if needed. 
     - **Simpler Alternative for Demo**: Verification logic in `App.js` currently trusts the claim. For the first Admin, you can temporarily allow access or use Firestore to store roles if Custom Claims are too complex to set up without a script.
     - **For Viva**: Explain that in a real app, a Super Admin creates other Admins.

## Default Roles
- Any new user is a **Student**.
- **Faculty/Admin**: Needs to be assigned.
