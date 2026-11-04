#include "DojoP15AnnouncerDesk.h"

#include "Engine/World.h"

void UDojoP15AnnouncerDesk::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	Silent = NewObject<UDojoP15NullAnnouncer>(this); // @explain: A subsystem is not an actor, so it makes its helper object with NewObject and owns it; nothing outside can end its life.
	Current = Silent;
}

UDojoP15AnnouncerDesk* UDojoP15AnnouncerDesk::Locate(const UWorld* LevelWorld)
{
	return LevelWorld ? LevelWorld->GetSubsystem<UDojoP15AnnouncerDesk>() : nullptr;
}

bool UDojoP15AnnouncerDesk::Install(UObject* Provider)
{
	if (!IsValid(Provider))
	{
		Current = Silent;
		return true;
	}

	if (!Provider->Implements<UDojoP15Announcer>()) return false;

	Current = Provider;
	return true;
}

IDojoP15Announcer& UDojoP15AnnouncerDesk::Get() const
{
	IDojoP15Announcer* Announcer = Cast<IDojoP15Announcer>(Current.Get());
	check(Announcer != nullptr);
	return *Announcer;
}

UObject* UDojoP15AnnouncerDesk::GetProvider() const
{
	return Current.Get();
}

UDojoP15NullAnnouncer* UDojoP15AnnouncerDesk::GetNullAnnouncer() const
{
	return Silent.Get();
}
