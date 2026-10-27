// Test user registration endpoint
test('test user registration', async () => {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'test', email: 'test@example.com' }), // added email to ensure valid user data
    });
  } catch (error) {
    console.error('Error registering user:', error); // added error handling
  }
    expect(response.status).toBe(201);
});
