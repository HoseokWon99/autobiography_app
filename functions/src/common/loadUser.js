const { userRepository } = require("../repository");
const logger = require("firebase-functions/logger");

const loadUser = async (req, res, next) => {

    try {
        const username = req.body.username;

        const snapshot = await userRepository
            .orderBy("email")
            .where("email", "==", username)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];

            if (doc.exists) {
                logger.log(doc);

                req.body.userId = doc.id;
                req.body.user = doc.data();

                next();
            }
            else {
                res.sendStatus(400);
            }

        }
        else {
            res.sendStatus(400);
        }

    }
    catch (error) {
        logger.error(error);
    }

};

module.exports = { loadUser };
