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
  name: string;
  genres: string[] = [];
  uid: string;
  // tslint:disable-next-line:max-line-length
  oauth = '';
  availableGenres: string[] = [];

  constructor(private http: HttpClient) { }

  getMedian( data: any[] ) {
      let median = 0;
      const numsLen = data.length;
      data.sort();

      median = data[Math.round((numsLen - 1) / 2)];

      return median;
  }
  getMean( data: any[] ) {
    let total = 0;
    for (let i = 0; i < data.length; i += 1) {
        total += data[i];
    }
    return total / data.length;
  }

  createPlaylist() {
    if (!this.name || !this.name.length) {
      this.name = new Date().toISOString();
    }
    const headers = new HttpHeaders()
                    .set('Accept', 'application/json')
                    .set('Authorization', `Bearer ${this.oauth}`)
                    .set('Content-Type', 'application/json');

    let params = `?limit=30&seed_genres=${this.genres}&`;
    this.properties.forEach( p => {
      params += `min_${p.key}=${p.min}&max_${p.key}=${p.max}&target_${p.key}=${p.avg}&`;
    });
    params = params.slice(0, -1);

    const uri = 'https://api.spotify.com/v1/recommendations' + params;
    this.http.get(uri, {headers}).subscribe( (s: any) => {
      const trackUris = s.tracks.reduce( (a, c) => a += c.uri + ',', '').slice(0, -1);
      const playlistBody = `{
        "name": "${this.name}",
        "description": "${this.genres}",
        "public": false
      }`;
      this.http.post(`https://api.spotify.com/v1/users/${this.uid}/playlists`, playlistBody, {headers}).subscribe( (p: any) => {
        const id = p.id;
        const songBody = `{ "uris": ${trackUris} }`;
        this.http.post(`https://api.spotify.com/v1/playlists/${id}/tracks?uris=${trackUris}`, songBody, {headers}).subscribe( s => {
          console.log('success');
        });
      });
    });
  }

  checkboxChecked(event: any, genre: string) {
    const index = this.genres.indexOf(genre);
    if (index < 0 && this.genres.length < 5) {
      this.genres.push(genre);
    } else if (index >= 0) {
      this.genres.splice(index, 1);
    }
  }

  selectionChanged(newValue) {
    this.properties = [];
    const obs = [];

    const headers = new HttpHeaders().set('Accept', 'application/json').set('Authorization', `Bearer ${this.oauth}`);
    let uri = newValue === 'favorites' ? 'https://api.spotify.com/v1/me/tracks' : 'https://api.spotify.com/v1/me/player/recently-played';
    uri += '?limit=50';

    // should be moved to only be done once
    this.http.get('https://api.spotify.com/v1/me', {headers}).subscribe( (m: any) => {
      this.uid = m.id;
    });

    this.http.get('https://api.spotify.com/v1/recommendations/available-genre-seeds', {headers}).subscribe( (r: any) => {
      this.availableGenres = r.genres;
    });

    const songRequest = this.http.get(uri, {headers});
    songRequest.subscribe( (d: any) => {
      const ids = d.items.reduce((a, c) => a += `${c.track.id},`, '').slice(0, -1);
      const artistIds = d.items.reduce((a, c) => a += `${c.track.artists[0].id},`, '').slice(0, -1);

      this.http.get(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {headers}).subscribe( (r: any) => {
        const props = {};
        r.audio_features.forEach(trackFeats => {
          Object.entries(trackFeats).forEach( ([k, v]) => {
            if (!props[k] ) {
              props[k] = [];
            }
            props[k].push(v);
          });
        });

        Object.entries(props).forEach( ([k, v]: [string, any[]]) => {
          if (v.length && typeof v[0] === 'number') {
            const median = this.getMedian(v);
            this.properties.push({
              key: k,
              min: Math.min(...v),
              max: Math.max(...v),
              mean: this.getMean(v),
              median: median,
              avg: median
            });
          }
        });
      });
    });
  }
}
