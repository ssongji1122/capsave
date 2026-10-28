interface IdentityResult { error: { message: string } | null }
type ExchangeIdentity = (input: { provider: 'google'; token: string }) => Promise<IdentityResult>;
export async function completeGoogleSignIn(token: string | undefined, exchange: ExchangeIdentity): Promise<void> {
 if (!token?.trim()) throw new Error('Google 인증 정보를 받지 못했습니다. 다시 로그인해 주십시오.');
 const { error } = await exchange({ provider: 'google', token });
 if (error) throw new Error(error.message);
}
