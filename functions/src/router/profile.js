const express = require("express");
const logger = require("firebase-functions/logger");
const { userRepository, profileRepository } = require("../repository");
const {validateHeader} = require("../common/validateHeader");
const {loadUser} = require("../common/loadUser");


const profileRouter = express.Router();

profileRouter.get("/api/profile", validateHeader, loadUser, async (req, res) => {

    try {
        const id = req.body.userId;
        const profile = (await profileRepository.doc(id).get()).data();

        res.status(200).send(profile);
    }
    catch (error) {
        logger.error(error);
    }

});

profileRouter.put("/api/profile", validateHeader, loadUser, async (req, res) => {

    try {
       const id = req.body.userId;

       await profileRepository.doc(id).set({
            nickname: req.body.nickname,
            introduce: req.body.introduce,
            profilePicture: req.body.profilePicture
       });
    }
    catch (error) {
        logger.error(error);
    }

});

module.exports = profileRouter;
