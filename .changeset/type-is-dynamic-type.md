---
"@jitaspace/db": minor
---

Add `Type.isDynamicType`, from `types.yaml`: whether a type is a mutated ("Abyssal") module — exactly the types a mutaplasmid produces, i.e. the `resultingType`s of `dynamicItemAttributes.yaml` (93 in build 3542233). Like `isRepackable`, CCP only ever serializes it as `true`, so every other type reads `null`.
