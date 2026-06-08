import React, { createContext, useContext, useMemo } from 'react';
import usePlacementTrackingDomUserInfo from '../hooks/usePlacementTrackingDomUserInfo';

export interface PlacementTrackingValue {
  urlUid: string | undefined;
  twitterId: string | undefined;
  handler: string;
  displayName: string;
  avatar: string;
  isFollowing: boolean;
  followState: 'follow' | 'unfollow' | null;
  placementTrackingEl: HTMLElement | null;
  followButton: HTMLButtonElement | null | undefined;
  loading: boolean;
  isEmptyState: boolean;
}

const PlacementTrackingContext = createContext<PlacementTrackingValue | null>(
  null
);

export function PlacementTrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hookValue = usePlacementTrackingDomUserInfo();

  const value = useMemo<PlacementTrackingValue>(
    () => ({
      currentUrl: hookValue.currentUrl,
      urlUid: hookValue.urlUid,
      twitterId: hookValue.twitterId,
      handler: hookValue.handler,
      displayName: hookValue.displayName,
      avatar: hookValue.avatar,
      isFollowing: hookValue.isFollowing,
      followState: hookValue.followState,
      placementTrackingEl: hookValue.placementTrackingEl,
      followButton: hookValue.followButton,
      loading: hookValue.loading,
      isEmptyState: hookValue.isEmptyState,
    }),
    [
      hookValue.currentUrl,
      hookValue.urlUid,
      hookValue.twitterId,
      hookValue.handler,
      hookValue.displayName,
      hookValue.avatar,
      hookValue.isFollowing,
      hookValue.followState,
      hookValue.placementTrackingEl,
      hookValue.followButton,
      hookValue.loading,
      hookValue.isEmptyState,
    ]
  );

  return (
    <PlacementTrackingContext.Provider value={value}>
      {children}
    </PlacementTrackingContext.Provider>
  );
}

export function usePlacementTrackingContext() {
  const ctx = useContext(PlacementTrackingContext);
  return ctx;
}
