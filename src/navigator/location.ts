export class Location {
  private cfi: string;
  private type: string;
  private href: string;
  private fragments: string[];
  private isPrecise: boolean;

  constructor(
    cfi: string,
    type: string,
    href: string,
    fragments: string[],
    isPrecise: boolean = true,
  ) {
    this.cfi = cfi;
    this.type = type;
    this.href = href;
    this.fragments = fragments;
    this.isPrecise = isPrecise;
  }

  public getFragments(): string[] {
    return this.fragments;
  }

  public getMediaType(): string {
    return this.type;
  }

  public getLocation(): string {
    return this.cfi;
  }

  public getHref(): string {
    return this.href;
  }

  public getLocationPrecision(): boolean {
    return this.isPrecise;
  }
}
