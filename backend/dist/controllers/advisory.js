"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToAdvisory = exports.updateAdvisoryRequest = exports.createAdvisoryRequest = exports.getAdvisoryRequests = void 0;
const getAdvisoryRequests = async (req, res) => {
    try {
        return res.status(501).json({ error: 'Not implemented' });
    }
    catch (err) {
        console.error('getAdvisoryRequests error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAdvisoryRequests = getAdvisoryRequests;
const createAdvisoryRequest = async (req, res) => {
    try {
        return res.status(501).json({ error: 'Not implemented' });
    }
    catch (err) {
        console.error('createAdvisoryRequest error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createAdvisoryRequest = createAdvisoryRequest;
const updateAdvisoryRequest = async (req, res) => {
    try {
        return res.status(501).json({ error: 'Not implemented' });
    }
    catch (err) {
        console.error('updateAdvisoryRequest error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateAdvisoryRequest = updateAdvisoryRequest;
const replyToAdvisory = async (req, res) => {
    try {
        return res.status(501).json({ error: 'Not implemented' });
    }
    catch (err) {
        console.error('replyToAdvisory error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.replyToAdvisory = replyToAdvisory;
//# sourceMappingURL=advisory.js.map