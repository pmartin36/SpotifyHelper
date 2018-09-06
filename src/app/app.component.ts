import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  properties = [];

  genres: string;
  // tslint:disable-next-line:max-line-length
  oauth = 'BQC1KeBL0CWdtxj1OltmYwTP1om3OdRaKd3IldrNHupvJ7hsjCs0CulRylZvgzN1X_cMv74GnikqAijVw45S2tresr3BtYbNKGoc8szFyvNtkVl3Qgdq5u9oyf-DNXA_e9iujeqV2J8gjSdjPKUtQXaXWyQjMt9hhAh0ghBj6T7tV0ZIGtMs6NmNfpxBcurFGd-mhOprC7T_fC0OyKetXJY1D3tU7-QNqjjjHkitUWAv_NhLUXoSzgRO59xXjqrs2AilGaIpKAQ4';

  constructor(private http: HttpClient) {}

  getMedian( data: any[] ) {
      let median = 0;
      const numsLen = data.length;
      data.sort();

      if ( numsLen % 2 === 0 ) {
        median = (data[numsLen / 2 - 1] + data[numsLen / 2]) / 2;
      } else { // is odd
        median = data[(numsLen - 1) / 2];
      }

      return median;
  }
  getMean( data: any[] ) {
    let total = 0;
    for (let i = 0; i < data.length; i += 1) {
        total += data[i];
    }
    return total / data.length;
  }

  selectionChanged(newValue) {
    this.properties = [];
    const obs = [];

    const headers = new HttpHeaders().set('Accept', 'application/json').set('Authorization', `Bearer ${this.oauth}`);
    let uri = newValue === 'favorites' ? 'https://api.spotify.com/v1/me/tracks' : 'https://api.spotify.com/v1/me/player/recently-played';
    uri += '?limit=50';

    const songRequest = this.http.get(uri, {headers});  
    songRequest.subscribe( (d: any) => {
      const ids = d.items.reduce((a, c) => a += `${c.track.id},`, '').slice(0, -1);
      const artistIds = d.items.reduce((a, c) => a += `${c.track.artists[0].id},`, '').slice(0, -1);
      obs.push(this.http.get(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {headers}));
      obs.push(this.http.get(	`https://api.spotify.com/v1/artists?ids=${artistIds}`, {headers}));

      forkJoin(...obs).subscribe( r => {
        this.genres = r[1].artists.reduce( (a, c) => a += c.genres.toString() + ',', '').slice(0, -1);
        const props = {};
        r[0].audio_features.forEach(trackFeats => {
          Object.entries(trackFeats).forEach( ([k, v]) => {
            if (!props[k] ) {
              props[k] = [];
            }
            props[k].push(v);
          });
        });

        Object.entries(props).forEach( ([k, v]: [string, any[]]) => {
          if (v.length && typeof v[0] === 'number') {
            const mean = this.getMean(v);
            this.properties.push({
              key: k,
              min: Math.min(...v),
              max: Math.max(...v),
              mean: mean,
              median: this.getMedian(v),
              avg: mean
            });
          }
        });
      });
    });
  }
}
