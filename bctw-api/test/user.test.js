const user_api = require('../user_api.js')
jest.mock('user_api');

// test('adds 1 + 2 to equal 3', () => {
//   expect((1 + 2)).toBe(3);
// });

user_api.getUserRole.mockResolvedValue({
  data: {
    rows: [
      { get_user_role: 'administrator'}
    ]
  }
})

test('can call get role, returns something', async () => {
  const res = await user_api.getUserRole('sdf');
  expect(user_api.getUserRole).toHaveBeenCalled();
  expect(res.data.rows[0].get_user_role).toBe('administrator')
})