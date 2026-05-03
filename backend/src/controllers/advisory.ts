import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';

export const getAdvisoryRequests = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err) {
    console.error('getAdvisoryRequests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAdvisoryRequest = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err) {
    console.error('createAdvisoryRequest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAdvisoryRequest = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err) {
    console.error('updateAdvisoryRequest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const replyToAdvisory = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err) {
    console.error('replyToAdvisory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
