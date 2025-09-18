export interface AppleAuthUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  appleId: string;
  age: number;
}

export class CreateAppleAuthUserCommand {
  constructor(
    public readonly payload: AppleAuthUserPayload,
    public readonly authId: string,
    public readonly profileId: string,
  ) { }
}
