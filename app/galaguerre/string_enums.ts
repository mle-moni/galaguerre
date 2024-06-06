export type GenerateTypeFromEnum<T extends readonly string[]> = T[number]

export type LabelObjectType<T extends string> = { [K in T]: string }

export const generateTypeObjectFromEnum = <T extends readonly string[]>(enumArray: T) => {
  return Object.fromEntries(enumArray.map((type) => [type, type])) as {
    [K in GenerateTypeFromEnum<T>]: K
  }
}

export const generateOptionsFromLabelObj = <T extends string>(labels: { [K in T]: string }) => {
  return Object.entries(labels).map(([k, v]) => ({ value: k, label: v })) as {
    value: T
    label: string
  }[]
}
