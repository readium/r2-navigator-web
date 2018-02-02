export abstract class View {
  public parent: View;

  public abstract render(): void;

  public abstract attatchToHost(host: HTMLElement): void;
}
