import { novu } from './index'
import { ChannelTypeEnum } from '@novu/node'

export const updateSubscriberPreference = async (
    subscriberId: string,
    templateId: string,
    type: string,
    enabled: boolean
) => {
    try {
        await novu.subscribers.updatePreference(subscriberId, templateId, {
            enabled: enabled,
            channel: { type: ChannelTypeEnum.EMAIL, enabled: enabled },
        });
    } catch (error) {
        console.error(error);
        throw new Error('Error updating subscriber preferences');
    }
};