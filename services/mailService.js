const SibApiV3Sdk = require("sib-api-v3-sdk");

// Initialize Brevo client
const client = SibApiV3Sdk.ApiClient.instance;

// Set API Key
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Initialize Transactional Email API
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendMail = async (receiverEmail, id) => {
    try {

        const response = await tranEmailApi.sendTransacEmail({

            sender: {
                email: "zurikara9@gmail.com",
                name: "Expense Tracker"
            },

            to: [
                {
                    email: receiverEmail
                }
            ],

            subject: "Reset Your Password",

            htmlContent: `
                <h2>Expense Tracker</h2>
                <p>Click the button below to reset your password.</p>

                <a href="http://localhost:3000/password/resetpassword/${id}">
                    Reset Password
                </a>
            `
        });

        console.log("Mail sent successfully");
        console.log(response);

        return response;

    } catch (err) {

        console.log("BREVO ERROR:");

        // Print the full error
        console.log(err);

        // Print Brevo response if available
        console.log(err.response?.body);

        throw err;   // Let the controller know the mail failed
    }
};


const sendChangePasswordOTP = async (receiverEmail, otp) => {

    try {

        const response = await tranEmailApi.sendTransacEmail({

            sender: {
                email: "zurikara9@gmail.com",
                name: "Expense Tracker"
            },

            to: [
                {
                    email: receiverEmail
                }
            ],

            subject: "Expense Tracker - Password Change Verification",

            htmlContent: `
                <div style="
                    font-family:Arial,sans-serif;
                    max-width:500px;
                    margin:auto;
                    padding:25px;
                    border:1px solid #eee;
                    border-radius:10px;
                ">

                    <h2>Expense Tracker</h2>

                    <p>
                        You requested to change your password.
                    </p>

                    <p>
                        Your verification code is:
                    </p>

                    <div style="
                        font-size:32px;
                        font-weight:bold;
                        letter-spacing:8px;
                        margin:20px 0;
                    ">
                        ${otp}
                    </div>

                    <p>
                        Enter this code in the Expense Tracker
                        application to complete the password change.
                    </p>

                    <p style="color:#777;">
                        If you did not request this change,
                        you can safely ignore this email.
                    </p>

                </div>
            `

        });

        console.log("Change password OTP email sent successfully");

        return response;

    }
    catch (err) {

        console.log("BREVO CHANGE PASSWORD ERROR:");
        console.log(err);
        console.log(err.response?.body);

        throw err;

    }

};

module.exports = {
    sendMail,
    sendChangePasswordOTP
};