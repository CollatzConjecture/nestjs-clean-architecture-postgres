export interface GoogleAuthUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  googleId: string;
  age: number;
}

export class CreateGoogleAuthUserCommand {
  constructor(
    public readonly payload: GoogleAuthUserPayload,
    public readonly authId: string,
    public readonly profileId: string,
  ) { }
}
