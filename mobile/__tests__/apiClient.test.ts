import { getApiClient, resetApiClient } from '../src/services/apiClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('apiClient singleton and interceptors (m4)', () => {
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      },
      defaults: { baseURL: '', headers: { common: {} } },
    } as any);
    resetApiClient();
    (global as { __DEV__?: boolean }).__DEV__ = true;
  });

  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it('returns the same singleton instance and only creates axios once', () => {
    const a = getApiClient();
    const b = getApiClient();
    expect(a).toBe(b);
    expect(mockedAxios.create).toHaveBeenCalledTimes(1);
  });

  it('logs outgoing requests in __DEV__', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const client = getApiClient();
    const requestHandler = (client.interceptors.request.use as jest.Mock).mock
      .calls[0][0];
    const cfg = { method: 'get', url: '/products' };
    expect(requestHandler(cfg)).toBe(cfg);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[API] GET /products'),
    );
    logSpy.mockRestore();
  });

  it('does not log requests when not in __DEV__', () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const client = getApiClient();
    const requestHandler = (client.interceptors.request.use as jest.Mock).mock
      .calls[0][0];
    requestHandler({ method: 'get', url: '/products' });
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('logs successful responses in __DEV__', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const client = getApiClient();
    const responseHandler = (client.interceptors.response.use as jest.Mock).mock
      .calls[0][0];
    const res = { status: 200, config: { url: '/products' } };
    expect(await responseHandler(res)).toBe(res);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[API] 200'),
    );
    logSpy.mockRestore();
  });

  it('logs errors in __DEV__ and re-throws (extension point)', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const client = getApiClient();
    const errorHandler = (client.interceptors.response.use as jest.Mock).mock
      .calls[0][1];
    const err = {
      config: { url: '/products' },
      message: 'boom',
      response: { data: '' },
    };
    await expect(errorHandler(err)).rejects.toBe(err);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[API Error]'),
      expect.anything(),
      expect.anything(),
    );
    errSpy.mockRestore();
  });
});
