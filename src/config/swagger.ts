export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ChatApp Real-Time API',
    version: '1.0.0',
    description: 'API documentation for the production-ready ChatApp real-time chat service.',
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server',
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'MD Hasan' },
                  email: { type: 'string', example: 'hasan@example.com' },
                  password: { type: 'string', example: 'password123' },
                },
                required: ['name', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'User registered successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: '60c72b2f9b1d8b2a1c8b4567' },
                            name: { type: 'string', example: 'MD Hasan' },
                            email: { type: 'string', example: 'hasan@example.com' },
                          },
                        },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login User',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'hasan@example.com' },
                  password: { type: 'string', example: 'password123' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged in successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Logged in successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: '60c72b2f9b1d8b2a1c8b4567' },
                            name: { type: 'string', example: 'MD Hasan' },
                            email: { type: 'string', example: 'hasan@example.com' },
                          },
                        },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh Access Token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Token refreshed successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout User',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged out successfully',
          },
        },
      },
    },
    '/auth/google': {
      post: {
        summary: 'Google OAuth authentication',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  idToken: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...' },
                },
                required: ['idToken'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged in with Google successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Logged in with Google successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: '60c72b2f9b1d8b2a1c8b4567' },
                            name: { type: 'string', example: 'MD Hasan' },
                            email: { type: 'string', example: 'hasan@example.com' },
                            photoUrl: { type: 'string', example: 'https://lh3.googleusercontent.com/a/...' },
                          },
                        },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
