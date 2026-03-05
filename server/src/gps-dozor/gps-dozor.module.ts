import { Module, Global } from '@nestjs/common';
import { GpsDozorService } from './gps-dozor.service';

@Global()
@Module({
    providers: [GpsDozorService],
    exports: [GpsDozorService],
})
export class GpsDozorModule {}
