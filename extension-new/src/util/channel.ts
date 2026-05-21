// Define the structure of the iterator result
type ChannelResult<T> = IteratorResult<T, undefined>;

export class Channel<T> implements AsyncIterable<T> {
  private queue: T[] = [];
  private resolvers: ((value: ChannelResult<T>) => void)[] = [];
  private isClosed = false;

  // Push data into the channel
  public push(value: T): void {
    if (this.isClosed) {
      return;
    }

    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve({ value, done: false });
    } else {
      this.queue.push(value);
    }
  }

  // Close the channel to unblock and end the loop
  public close(): void {
    this.isClosed = true;
    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve({ value: undefined, done: true });
    }
  }

  // Implement the AsyncIterable interface
  public [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<ChannelResult<T>> => {
        if (this.queue.length > 0) {
          const value = this.queue.shift()!;
          return Promise.resolve({ value, done: false });
        }

        if (this.isClosed) {
          return Promise.resolve({ value: undefined, done: true });
        }

        return new Promise<ChannelResult<T>>((resolve) => {
          this.resolvers.push(resolve);
        });
      }
    };
  }
}
