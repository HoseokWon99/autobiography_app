const express = require("express");
const logger = require("firebase-functions/logger");
const { mailRepository, userRepository, blacklist } = require("../repository");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const {validateHeader} = require("../common/validateHeader");
const {loadUser} = require("../common/loadUser");


const authRouter = express.Router();

authRouter.post("/auth/email", async (req, res) => {

    try {
        const to = req.body.email;

        const doc =  await userRepository
            .where("email", "==", to)
            .limit(1)
            .get();

        if (doc.empty) {

            const message = {
                subject: "자서전앱 인증번호",
                text: function() {
                    let ret = "";

                    for (let i = 0; i !== 4; ++i)
                        ret += Math.floor(Math.random()*10).toString();

                    return ret;
                }(),
            };

            const newDoc = await mailRepository.add({
                to: to,
                message: message,
            });

            res.status(200).send({
                certification_key: newDoc.id
            });
        }
        else {
            res.status(400).send("이미 존재하는 이메일 입니다");
        }
    }
    catch (error) {
        logger.error(error);
    }

});

authRouter.post("/auth/email/validation", async (req, res) => {

    try {
        const key = req.body.certification_key;
        const code = req.body.certification_code;

        const doc = await mailRepository.doc(key).get();

        if (doc.exists) {
            const mail = doc.data();

            res.status(200).send({
                is_validated: code === mail.message.text ? 0 : 1
            });
        }
        else {
            res.status(400).send("invalid key");
        }

    }
    catch(error) {
        logger.error(error);
    }

});

authRouter.post("/auth/sign-up",  async (req, res, next) => {

    try {
        const {email, password, name, nickname, tel, birth} = req.body;

        if (!(typeof email === 'string' && email.match(/^[a-zA-Z0-9+-_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/)))
            return res.status(200).send({success: 1, detail: "invalid email"});

        if (!(typeof password === 'string' && password.match(/^(?!(([A-Za-z]+)|([~!@#$%^&*()_+=]+)|([0-9]+))$)[A-Za-z\d~!@#$%^&*()_+=]{8,16}$/)))
            return res.status(200).send({success: 1, detail: "invalid password"});

        if (!(typeof name === 'string' && name.length !== 0))
            return res.status(200).send({success: 1, detail: "invalid name"});

        if (!(typeof nickname === 'string' && nickname.length !== 0))
            return res.status(200).send({success: 1, detail: "invalid nickname"});

        if (!(typeof tel === 'string' && tel.match(/^010(\d{4})(\d{4})$/)))
            return res.status(200).send({success: 1, detail: "invalid tel"});

        if (!(typeof birth === 'string' && birth.match(/^([0-9]{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[1,2][0-9]|3[0,1]))$/)))
            return res.status(200).send({success: 1, detail: "invalid birth"});

        next();
    }
    catch (error) {
        next(error);
    }

}, async (req, res, next) => {

    try {
        const user = req.body;

        const doc = await userRepository
            .where("email", "==", user.email)
            .limit(1)
            .get();

        if (doc.empty) {
            user.type = "native";
            user.createdAt = new Date().toLocaleDateString();
            user.updatedAt = "";

            await userRepository.add(user);

            res.status(200).send({
                success: 0,
                detail: "success"
            });
        }
        else {
            res.status(200).send({
                success: 1,
                detail: "이미 존재하는 이메일 입니다."
            });
        }
    }
    catch (error) {
        next(error);
    }

}, (err, req) => {
    logger.error(err);
});

const createToken = (username, expiresIn) => {
    return jwt.sign(
        { username: username },
        "secret",
        { expiresIn: expiresIn }
    );
}

authRouter.post("/auth/sign-in", async (req, res) => {

    try {
        const { email, password } = req.body;

        const doc = await userRepository
            .where("email", "==", email)
            .limit(1)
            .get();

        if (doc.empty) {
            res.status(200).send({ success: 1 });
        }
        else {
            const user = doc.docs[0].data();

            if (password !== user.password) {
                res.status(200).send({ success: 1 });
            }
            else {
                const accessToken = createToken(user.email, "1h");
                const refreshToken = createToken(user.email, "365d");

                res.status(200).send({
                    success: 0,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                });
            }
        }
    }
    catch (error) {
        logger.error(error);
    }

});

authRouter.get("/auth/kakao/callback", async (req, res) => {

    try {

        const response = await axios.post(
            "https://kauth.kakao.com/oauth/token",
            {
                grant_type: "authorization_code",
                client_id: "65206fdd79e2cb40a2cfe63955968c83",
                redirect_uri: "https://autobiography-9d461.web.app/auth/kakao/callback",
                code: req.query.code,
            },
            {
                headers: { "Content-type": "application/x-www-form-urlencoded;charset=utf-8", },
            }
        );

        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        const idToken = response.data.id_token;

        const payload = idToken.split(".")[1];
        const info = JSON.parse(atob(payload));
        const { nickname, email } = info;

        const snapshot = await userRepository
            .where("email", "==", email)
            .limit(1)
            .get();

        if (snapshot.empty) {

            await userRepository.add({
                email: email,
                nickname: nickname,
                accessToken: accessToken,
                refreshToken: refreshToken,
                type: "kakao",
                createdAt: new Date().toLocaleDateString(),
                updatedAt: "",
            });

        }
        else {
            const doc = snapshot.docs[0];

            await userRepository.doc(doc.id).update({
                email: email,
                nickname: nickname,
                accessToken: accessToken,
                refreshToken: refreshToken,
                updatedAt: new Date().toLocaleDateString(),
            });
        }

        res.status(200).send(response.data);

    }
    catch (e) {
        logger.error(e);
    }

})

authRouter.get('/auth/sign-out', validateHeader, async (req, res) => {

    try {
        const token = req.get("Authorization").substring(7);
        await blacklist.add({ token: token });
        res.sendStatus(200);
    }
    catch (error) {
        logger.error(error);
    }

});

authRouter.post('/auth/renew', async (req, res) => {

    try {
        const token = req.body.refreshToken;

        try {
            const jws = jwt.verify(token, "secret");

            res.status(200).send({
                accessToken: createToken(jws.username, "1h"),
            });
        }
        catch (error) {
            logger.error(error);
            res.sendStatus(401);
        }

    }
    catch (error) {
        logger.error(error);
    }

});

authRouter.delete('/auth/exit', validateHeader, loadUser, async (req, res) => {

    try {
        const id = req.body.userId;
        await userRepository.doc(id).delete();
        res.sendStatus(200);
    }
    catch (error) {
        logger.error(error);
    }

});

module.exports = authRouter;
