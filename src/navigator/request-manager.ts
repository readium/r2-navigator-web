import { CancellationToken } from './views/types';

export class NavigationRequestManager {
  private cancelToken: CancellationToken | null = null;

  public startRequest(): CancellationToken {
    if (this.cancelToken) {
      this.cancelToken.isCancelled = true;
    }

    this.cancelToken = new CancellationToken();

    return this.cancelToken;
  }

  public endRequest(cancelToken: CancellationToken): void {
    if (cancelToken === this.cancelToken) {
      this.cancelToken = null;
    }
  }

  // tslint:disable-next-line:max-line-length
  public async executeNavigationAction(navAction: (token: CancellationToken) => Promise<void>): Promise<void> {
    const t = this.startRequest();
    await navAction(t);
    this.endRequest(t);
  }
}
