import { completeGoogleSignIn } from '../google-sign-in';
describe('Google sign-in completion', () => {
 it('passes the identity token to Supabase', async () => {
  const exchange = jest.fn().mockResolvedValue({error:null});
  await completeGoogleSignIn('test-identity',exchange);
  expect(exchange).toHaveBeenCalledWith({provider:'google',token:'test-identity'});
 });
 it('rejects an empty identity before contacting Supabase', async () => {
  const exchange=jest.fn();
  await expect(completeGoogleSignIn(undefined,exchange)).rejects.toThrow('인증 정보를 받지 못했습니다');
  expect(exchange).not.toHaveBeenCalled();
 });
 it('surfaces returned Supabase errors rather than silently remaining logged out', async () => {
  await expect(completeGoogleSignIn('test-identity',async()=>({error:{message:'identity rejected'}}))).rejects.toThrow('identity rejected');
 });
});
