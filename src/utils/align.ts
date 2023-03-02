export function alignCenter(str: string, width: number, fill?: string): string {
    fill = fill || " ";
    const left = Math.floor((width - str.length) / 2)
      , right = width - str.length - left;

    return fill.repeat(left) + str + fill.repeat(right);
}