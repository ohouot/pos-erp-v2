import { Global, Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway.js";
import { AblyService } from "./ably.service.js";
import { RealtimeService } from "./realtime.service.js";
import { RealtimeController } from "./realtime.controller.js";

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeGateway, AblyService, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
