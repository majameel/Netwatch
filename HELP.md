
# NetPulse Help: Setting Up Alerts

This guide explains how to set up the secure webhook integrations for receiving alerts from NetPulse to Slack and Email.

## What is a Webhook?

A webhook is a secure way for applications to send messages to each other. For security reasons, a web application running in your browser (like NetPulse) **cannot** directly handle sensitive information like email passwords or API tokens.

Instead, NetPulse sends a detailed, non-sensitive alert payload to a unique URL you provide (your "webhook URL"). This URL points to a service that is authorized to handle the final notification.

-   **For Slack:** Slack provides these URLs directly.
-   **For Email:** You will need a small, simple backend service (like a serverless function or a script on a VM) that receives the webhook payload from NetPulse and then uses a mail library to send the email.

---

## Section 1: How to Get a Slack Incoming Webhook URL

Slack makes it very easy to get a URL that you can paste directly into NetPulse's settings.

1.  **Create a Slack App:**
    *   Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click "Create New App".
    *   Choose "From scratch".
    *   Give your app a name (e.g., "NetPulse Alerter") and select the Slack workspace you want to post notifications to. Click "Create App".

2.  **Activate Incoming Webhooks:**
    *   From your new app's settings page, click on "Incoming Webhooks" in the feature list.
    *   Toggle the switch to "On".

3.  **Create a Webhook for a Channel:**
    *   Scroll down and click "Add New Webhook to Workspace".
    *   Choose the channel where you want the alerts to be posted (e.g., `#network-alerts`).
    *   Click "Allow".

4.  **Copy Your Webhook URL:**
    *   You will be redirected back to the settings page. A new entry will appear in the "Webhook URL" list.
    *   Click "Copy". The URL will look something like this: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`

5.  **Paste into NetPulse:**
    *   Paste this URL into the "Slack Alert Webhook URL" field in the NetPulse settings and save.

---

## Section 2: How to Set Up Email Alerts

Sending emails requires a backend component to securely handle your email credentials. Here's a guide using Gmail as an example.

### Step 1: Generate a Gmail App Password

For security, you should not use your main Google password. Instead, generate a special "App Password".

1.  **Enable 2-Step Verification:** You **must** have 2-Step Verification enabled on your Google Account. If you don't, enable it here: [https://myaccount.google.com/security](https://myaccount.google.com/security)

2.  **Go to App Passwords:** Visit [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

3.  **Create a New App Password:**
    *   Under "Select app", choose "Mail".
    *   Under "Select device", choose "Other (Custom name)".
    *   Give it a name, like "NetPulseAlerts".
    *   Click "Generate".

4.  **Save Your Password:**
    *   Google will show you a 16-character password in a yellow box.
    *   **Copy this password immediately.** This is the only time you will see it. You will use this password in your backend script, not your regular Gmail password.

### Step 2: Create a Backend Webhook Handler

You need a small backend service that will:
1.  Have an endpoint (URL) that you can paste into NetPulse's "Email Alert Webhook URL" field.
2.  Listen for POST requests at that URL.
3.  Receive the JSON payload from NetPulse.
4.  Use an email library (like `nodemailer` for Node.js or `smtplib` for Python) to send an email using your Gmail address and the App Password you just generated.

This service can be a simple script running on a VM, a serverless function (AWS Lambda, Google Cloud Function), or another Docker container. The key is that this is where your email credentials live, safely outside of the frontend application.
