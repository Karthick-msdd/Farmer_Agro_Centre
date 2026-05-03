import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
