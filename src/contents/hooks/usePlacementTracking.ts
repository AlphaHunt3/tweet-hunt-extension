import { usePlacementTrackingContext } from '../contexts/PlacementTrackingContext';
import usePlacementTrackingDomUserInfo from './usePlacementTrackingDomUserInfo';

// Compatibility hook: prefer Context value only when no options provided
// If options (ready, shouldAttach, onFollowBtnClick) are provided, use the hook directly
// to ensure callbacks and configurations are properly passed through.
export default function usePlacementTracking(
  options?: Parameters<typeof usePlacementTrackingDomUserInfo>[0]
) {
  const ctx = usePlacementTrackingContext();
  
  // If options are provided (e.g., callbacks for follow button tracking),
  // we must use the hook directly to pass those options through.
  // Context values don't include these dynamic callbacks.
  if (!options && ctx) {
    return ctx as ReturnType<typeof usePlacementTrackingDomUserInfo>;
  }
  
  return usePlacementTrackingDomUserInfo(options);
}
