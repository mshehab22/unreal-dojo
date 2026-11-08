#include "DojoP22HudTicker.h"

void UDojoP22HudTicker::PushLine(const FString& Line)
{
	Lines.Add(Line);
	if (Lines.Num() > MaxLines) Lines.RemoveAt(0);
	++PushedCount;
}

void UDojoP22HudTicker::FlashEdge(FLinearColor Color)
{
	LastFlash = Color;
	++FlashCount;
}

TArray<FString> UDojoP22HudTicker::GetLines() const
{
	return Lines;
}

int32 UDojoP22HudTicker::GetPushedCount() const
{
	return PushedCount;
}

int32 UDojoP22HudTicker::GetFlashCount() const
{
	return FlashCount;
}

FLinearColor UDojoP22HudTicker::GetLastFlash() const
{
	return LastFlash;
}
