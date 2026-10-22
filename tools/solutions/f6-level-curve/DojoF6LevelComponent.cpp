#include "DojoF6LevelComponent.h"

#include "Curves/CurveFloat.h"

UDojoF6LevelComponent::UDojoF6LevelComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

int32 UDojoF6LevelComponent::AddXP(float Amount)
{
	if (!ensureMsgf(IsValid(XPCurve), TEXT("%s has no XP curve, so XP is ignored"), *GetName())) return 0;
	if (Level >= MaxLevel || Amount <= 0.f) return 0;

	XP += Amount;

	int32 Gained = 0;
	while (Level < MaxLevel)
	{
		const float Needed = GetXPToNext();
		if (!ensureMsgf(Needed > 0.f, TEXT("%s: the XP curve asks for %f XP at level %d"), *GetName(), Needed, Level)) break;
		if (XP < Needed) break;

		XP -= Needed;
		Level++;
		Gained++;
	}

	if (Level >= MaxLevel) XP = 0.f;
	return Gained;
}

void UDojoF6LevelComponent::ResetProgress()
{
	Level = 1;
	XP = 0.f;
}

int32 UDojoF6LevelComponent::GetLevel() const
{
	return Level;
}

float UDojoF6LevelComponent::GetXP() const
{
	return XP;
}

float UDojoF6LevelComponent::GetXPToNext() const
{
	if (!IsValid(XPCurve) || Level >= MaxLevel) return 0.f;

	return XPCurve->GetFloatValue(Level);
}
