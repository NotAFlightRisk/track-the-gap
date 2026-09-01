/** The day types a line has timetabled headways for, across both of its directions. */
const dayTypesOf = (line) =>
  new Set(line.directions.flatMap((d) => Object.values(d.expected).flatMap(Object.keys)));

/** Lines that have quietly lost a day type, which is TfL serving a timetable mid-update. */
export function lostDayTypes(before, after) {
  const had = new Map(before.map((line) => [line.id, dayTypesOf(line)]));
  return after.flatMap((line) => {
    const now = dayTypesOf(line);
    const gone = [...(had.get(line.id) ?? [])].filter((day) => !now.has(day)).sort();
    return gone.length ? [`${line.id} lost ${gone.join(', ')}`] : [];
  });
}
