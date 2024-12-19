const express = require("express");
const logger = require("firebase-functions/logger");
const { boardRepository, profileRepository} = require("../repository");
const { validateHeader} = require("../common/validateHeader");
const { loadUser } = require("../common/loadUser");
const {firestore} = require("firebase-admin");

const boardRouter = express.Router();

const loadUserPosts = async (id) => {
    const doc = await boardRepository.doc(id).get();
    const data = doc.data();

    return Object.entries(data)
        .sort((next, prev) => {
            const prev_id = Number.parseInt(prev[0]);
            const next_id = Number.parseInt(next[0]);
            return next_id - prev_id;
        });
}

boardRouter.get("/my-boards", validateHeader, loadUser, async (req, res) => {

    try {
        const id = req.body.userId;
        const posts = await loadUserPosts(id);
        res.status(200).send(posts);
    }
    catch (e) {
        logger.error(e);
    }

});

boardRouter.get("/api/board", validateHeader, async (req, res) => {

    try {
        const snapshot = await boardRepository.get();
        const resBody = [];

        for (const doc of snapshot.docs) {

            const posts = Object.values(doc.data())
                .filter(post => !post.secret);

            if (posts.length)
                resBody.push(posts);

        }

        res.status(200).send(resBody);
    }
    catch (e) {
        logger.error(e);
    }

});

boardRouter.post("/api/board/saveForm", validateHeader, loadUser, async (req, res) => {
    const { userId, question, title, content, secret } = req.body;

    try {
        const docRef = await boardRepository.doc(userId);

        const boardId = await (async () => {
            const snapshot = await docRef.get();
            return snapshot.exists ? Object.keys(snapshot.data()).length : 0;
        })();

        await docRef.set({
            [boardId.toString()] : {
                question: question,
                title: title,
                content: content,
                secret: secret,
                updatedAt: new Date().toLocaleDateString(),
            }
        }, { merge: true });

        res.status(200).send({
            id: boardId
        });
    }
    catch (e) {
        logger.error(e);
    }

});

boardRouter.put("/api/board/:id", validateHeader, loadUser, async (req, res) => {

    try {
        const boardId = req.params.id;
        const { userId, question, title, content, secret } = req.body;

        await boardRepository.doc(userId).set({
            [boardId.toString()] : {
                question: question,
                title: title,
                content: content,
                secret: secret,
                updatedAt: new Date().toLocaleDateString(),
            }
        }, { merge: true });
    }
    catch (e) {
        logger.error(e);
    }

});

boardRouter.delete("/api/board/:id", validateHeader, loadUser, async (req, res) => {

    try {
        const userId = req.body.userId;
        const boardId = req.params.id;
        await boardRepository.doc(userId).update({[boardId]: firestore.FieldValue.delete()});
    }
    catch (e) {
        logger.error(e);
    }

});


module.exports = boardRouter;
