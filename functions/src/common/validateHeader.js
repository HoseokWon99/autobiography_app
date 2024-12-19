const { blacklist } = require("../repository");
const jwt = require("jsonwebtoken");
const logger = require("firebase-functions/logger");

const validateHeader = async (req, res, next) => {

    try {
        const token = req.get("Authorization").substring(7);

        if (await didSignIn(token)) {
            const username = getUsername(token);

            if (username.length) {
                req.body.username = username;
                next();
            }
            else {
                res.sendStatus(401);
            }
        }
        else {
            res.sendStatus(401);
        }

    }
    catch (error) {
        logger.error(error);
    }

};

async function didSignIn(token) {

    const snapshot = await blacklist
        .orderBy("token")
        .where("token", "==", token)
        .limit(1)
        .get();

    return snapshot.empty;
}

function getUsername(token) {
    let username = "";

    try {
        const verified = jwt.verify(token, "secret");

        if (typeof verified === 'object' && verified !== null) {

            if (typeof verified.username === 'string')
                username = verified.username;

        }

    }
    catch (error) {
        logger.error(error);
        return username;
    }

    return username;
}

module.exports = { validateHeader };
