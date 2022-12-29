import { QueueItem } from './QueueItem';

export interface GetUserQueueResponse {
    currently_playing: QueueItem
    queue: QueueItem[] // include those added in queued
}