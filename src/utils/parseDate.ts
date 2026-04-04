export function parseBrazilianDate(dateString: string) {
    const [day, month, year] = dateString.split("/");
    return new Date(`${year}-${month}-${day}`);
}