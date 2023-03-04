export function equals<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>, itemEquals: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0, len = a.length; i < len; i++) {
        if (!itemEquals(a[i], b[i])) {
            return false;
        }
    }

    return true;
}