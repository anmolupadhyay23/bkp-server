const express = require('express');
const User = require('../models/userModel');
const authRouter = express.Router();
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const bcryptjs = require('bcryptjs');
const Otp = require('../models/otpModel');
const jwt = require('jsonwebtoken');
dotenv.config()

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    secure: true,
    auth: {
        user: `${process.env.EMAIL}`,
        pass: `${process.env.PASS}`
    }
})

const sendOtp = async ({ _id, email, name }, res) => {
    try {
        const otp = otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });

        const mailOptions = {
            from: `${process.env.EMAIL}`,
            to: email,
            subject: "Verify your email",
            html: `<p>Hi ${name},</p><p>This is a <i>Verification</i> e-mail</p><p>Please enter <b>${otp}</b> to verify.</p><p><img src="https://img.freepik.com/free-vector/two-factor-authentication-concept-illustration_114360-5488.jpg?w=740&t=st=1691404201~exp=1691404801~hmac=e9046c8583658c936a3fced2ad66ae3071ed347b4d4dc6bd0ac91f871711884d"></p>`
        }

        const salt = 10;

        const hashedOtp = await bcryptjs.hash(otp, salt);

        const newOtp = await new Otp({
            userId: _id,
            otp: hashedOtp,
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000
        })

        await newOtp.save();

        transporter.sendMail(mailOptions, (e) => {
            if (e) {
                console.log(`E-mail not sent: ${e}`)
                res.json({ msg: "Email not sent" })
            }
            else {
                console.log("Email sent")
                res.json({ msg: "Email sent" })
            }
        })

    } catch (e) {
        return res.json({
            status: "FAILED",
            message: e.message
        })
    }
}

authRouter.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'User already exists' })
        }

        // hash password
        const hashedPassword = await bcryptjs.hash(password, 8);

        let user = new User({
            name,
            email,
            password: hashedPassword,
            verified: false
        })

        var userDetails;
        // send otp and save user
        user = await user.save().then((result) => {
            sendOtp(result, res);
            userDetails = result;
        })

        res.status(200).json(userDetails);

    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

authRouter.post('/verify-otp', async (req, res) => {
    try {
        let { userId, otp } = req.body;

        if (!otp) {
            throw Error("Empty otp details.")
        } else {
            const isOtp = await Otp.find({
                userId
            });

            if (isOtp.length <= 0) {
                throw new Error("Account record does not exist or has been verified already. Please sign up or log in")
            } else {
                const { expiresAt } = isOtp[0];
                const hashedOtp = isOtp[0].otp;

                if (expiresAt < Date.now()) {
                    Otp.deleteMany({ userId });
                    throw new Error("Code has expired. Please request again.")
                } else {
                    const validOtp = await bcryptjs.compare(otp, hashedOtp);

                    if (!validOtp) {
                        throw new Error("Invalid Code");
                    } else {
                        await User.updateOne({ _id: userId }, { verified: true });
                        await Otp.deleteMany({ userId });
                    }

                    res.status(200).json({ msg: "Two-factor authentication successfully done." })
                }

            }

        }
    } catch (e) {
        res.json({ status: 'FAILED', message: e.message });
    }
})

authRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'User does not exist.' });
        }

        const isVerified = user.verified;

        const isMatch = await bcryptjs.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Password.' });
        }

        if (isVerified == false) {
            return res.status(400).json({ msg: 'Two factor authorization missing.' })
        }

        const token = jwt.sign({id: user._id}, "jsonKey");
        res.status(200).json({ token,  ...user._doc });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
})

module.exports = authRouter;