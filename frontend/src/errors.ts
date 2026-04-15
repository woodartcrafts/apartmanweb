export class Silent403Error extends Error {
  readonly isSilent403 = true;
  constructor(message?: string) {
    super(message);
    this.name = "Silent403Error";
  }
}
