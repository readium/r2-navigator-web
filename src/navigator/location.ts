export class Location {
  private cfi: string;
  private href: string;
  private isPrecise: boolean;

  constructor(cfi: string, href: string, isPrecise: boolean = true) {
    this.cfi = cfi;
    this.href = href;
    this.isPrecise = isPrecise;
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
